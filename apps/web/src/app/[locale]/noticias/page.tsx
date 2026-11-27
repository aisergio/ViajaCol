import { ListPage, listMetadata, type LocaleProps } from '@/components/catalog/pages';

export function generateMetadata(props: LocaleProps) {
  return listMetadata('noticias', props);
}

export default function Page(props: LocaleProps) {
  return <ListPage category="noticias" params={props.params} />;
}
